<?php

namespace App\Support;

use App\Models\AuditTrailLog;

/**
 * Writing a record's changes to audit_trail_logs, and reading them back as a
 * trail a person can follow: who, when, and what each change did.
 *
 * Rows have always been written in more than one shape — some carry the whole
 * record with no "before", some a whole record after with only a status before,
 * some just the fields that moved. So a trail is read by replaying the rows
 * oldest first and carrying the record forward: each row's "before" is the
 * state the earlier rows left, overlaid with whatever "before" it stored
 * itself. That is what gives every change a real old value rather than a blank.
 */
class AuditTrail
{
    /** What value() answers for a field a snapshot does not mention. */
    public const ABSENT = "\0absent";

    /**
     * Write one change. `$before` null means the record was just created.
     *
     * @param  array|null  $before  the record's audited values before, or null
     * @param  array       $after   the record's audited values after
     * @param  string|null $action  a tag for a change that is not a plain edit
     */
    public static function record(string $type, $id, ?array $before, array $after, ?string $by, ?string $action = null): AuditTrailLog
    {
        $wrap = fn (array $data) => array_filter([
            'type'   => $type,
            'id'     => $id,
            'action' => $action,
            'data'   => $data,
        ], fn ($v) => $v !== null);

        return AuditTrailLog::create([
            'old_details'     => $before === null ? null : $wrap($before),
            'new_details'     => $wrap($after),
            'created_by_user' => $by ?: 'System',
            'updated_by_user' => $by ?: 'System',
        ]);
    }

    /**
     * A record's trail, newest first.
     *
     * @param  array  $fields   field => [label, kind]; kind is 'text', 'money' or 'images'
     * @param  array  $options  'value'   => field => fn(array $data): mixed|ABSENT, for a field
     *                                       not stored under its own name;
     *                          'action'  => fn(array $new, array $before, array $newData, bool $isFirst): ?string
     *                                       to name an entry; null falls back to the default;
     *                          'actions' => tag => label, for rows written with an action tag.
     * @return array<int, array{id: int, action: string, changed_by: ?string, changed_at: mixed, changes: array}>
     */
    public static function entries(string $type, $id, array $fields, array $options = []): array
    {
        $logs = AuditTrailLog::query()
            ->where(function ($q) use ($type, $id) {
                foreach (['new_details', 'old_details'] as $column) {
                    $q->orWhere(function ($w) use ($column, $type, $id) {
                        $w->whereRaw("JSON_UNQUOTE(JSON_EXTRACT({$column}, '$.type')) = ?", [$type])
                          ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT({$column}, '$.id')) = ?", [(string) $id]);
                    });
                }
            })
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $valueOf = fn (array $data, string $field) => isset($options['value'][$field])
            ? ($options['value'][$field])($data)
            : self::value($data, $field, $fields[$field][1] ?? 'text');

        $entries = [];
        $state   = [];

        foreach ($logs as $log) {
            $old = is_array($log->old_details) ? $log->old_details : [];
            $new = is_array($log->new_details) ? $log->new_details : [];

            // A row's values either side. Some "befores" are flat ({status:
            // Pending}); everything else nests under `data`.
            $oldData = isset($old['data']) && is_array($old['data'])
                ? $old['data']
                : array_diff_key($old, array_flip(['type', 'id', 'action', 'note']));
            $newData = isset($new['data']) && is_array($new['data']) ? $new['data'] : [];

            $before  = array_merge($state, $oldData);
            $isFirst = $state === [] && $old === [];

            $changes = [];
            foreach ($fields as $field => [$label, $kind]) {
                $after = $valueOf($newData, $field);
                if ($after === self::ABSENT) {
                    continue;
                }

                $prior = $valueOf($before, $field);
                $prior = $prior === self::ABSENT ? null : $prior;

                if ($prior === $after || ($isFirst && ($after === null || $after === []))) {
                    continue;
                }

                $changes[] = [
                    'field' => $field,
                    'label' => $label,
                    'kind'  => $kind,
                    'old'   => $isFirst ? null : $prior,
                    'new'   => $after,
                ];
            }

            $tag    = $new['action'] ?? null;
            $action = isset($options['action']) ? ($options['action'])($new, $before, $newData, $isFirst) : null;
            $action ??= match (true) {
                $tag !== null => $options['actions'][$tag] ?? ucfirst(str_replace('_', ' ', $tag)),
                $isFirst      => 'Created',
                default       => 'Updated',
            };

            $state = array_merge($before, $newData);

            $entries[] = [
                'id'         => $log->id,
                'action'     => $action,
                'changed_by' => $log->created_by_user,
                'changed_at' => $log->created_at,
                'changes'    => $changes,
            ];
        }

        return array_reverse($entries);
    }

    /**
     * One field's value from a snapshot, normalised so the same value always
     * compares equal however it was stored ("3200.00", 3200, 3200.0).
     * ABSENT when the snapshot does not mention the field.
     */
    public static function value(array $data, string $field, string $kind = 'text')
    {
        if (!array_key_exists($field, $data)) {
            return self::ABSENT;
        }

        $value = $data[$field];
        if ($value === null || $value === '') {
            return null;
        }

        if ($kind === 'images') {
            return is_array($value) ? array_values(array_map('strval', $value)) : [(string) $value];
        }

        return $kind === 'money'
            ? number_format((float) $value, 2, '.', '')
            : (string) $value;
    }
}
