import React from 'react';
import { Check } from 'lucide-react';

/** How many recommendations show at once, before typing and while typing. */
export const SUGGESTION_LIMIT = 10;

const hexToRgba = (hex: string, opacity: number) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` : hex;
};

/**
 * The distinct values in a column, most common first.
 *
 * Values that differ only in case or surrounding spaces count as one: the text
 * filter matches case-insensitively, so offering both would offer the same
 * filter twice. Blanks and the "-" placeholder some getters return for an empty
 * cell are dropped. Ties sort alphabetically so the list is the same every time
 * the panel opens.
 */
export const rankSuggestions = (values: unknown[]): string[] => {
  const counts = new Map<string, { label: string; count: number }>();

  values.forEach(raw => {
    if (raw === null || raw === undefined || typeof raw === 'object') return;

    const label = String(raw).trim();
    if (label === '' || label === '-') return;

    const key = label.toLowerCase();
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
    } else {
      counts.set(key, { label, count: 1 });
    }
  });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map(entry => entry.label);
};

/**
 * A `getSuggestions` for a funnel filter, read from the rows a page has loaded.
 *
 * Pass the same value getter the page filters with, so a recommendation is
 * always something the filter can match. Each column is ranked the first time
 * it is asked for and kept, so typing in the panel does not re-scan every row
 * on each keystroke; build a new source (useMemo on the rows) when the rows
 * change.
 */
export const suggestionSource = <T,>(rows: T[], getValue: (row: T, key: string) => unknown) => {
  const cache = new Map<string, string[]>();

  return (key: string): string[] => {
    let ranked = cache.get(key);
    if (!ranked) {
      ranked = rankSuggestions(rows.map(row => getValue(row, key)));
      cache.set(key, ranked);
    }
    return ranked;
  };
};

interface FilterTextSuggestProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Every distinct value for the column, most common first — see rankSuggestions(). */
  suggestions: string[];
  isDarkMode: boolean;
  primaryColor: string;
}

/**
 * A funnel filter's text field, with the column's values recommended under it.
 *
 * Before anything is typed the ten most common values are listed; typing
 * narrows the list to values containing the text, those starting with it first.
 * Picking one fills the field — it is still a "contains" filter, so the field
 * can be edited further. With no rows to draw from it is the plain field it
 * always was.
 */
const FilterTextSuggest: React.FC<FilterTextSuggestProps> = ({
  value,
  onChange,
  placeholder,
  suggestions,
  isDarkMode,
  primaryColor,
}) => {
  const term = value.trim().toLowerCase();

  const matches = term === ''
    ? suggestions
    : suggestions
      .filter(s => s.toLowerCase().includes(term))
      // Stable sort: values starting with the text come first, each group
      // keeping its most-common-first order.
      .sort((a, b) => Number(b.toLowerCase().startsWith(term)) - Number(a.toLowerCase().startsWith(term)));

  const shown = matches.slice(0, SUGGESTION_LIMIT);

  return (
    <div className="text-left">
      <label className={`text-sm font-medium mb-2 block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Search Value
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded border focus:outline-none transition-all ${isDarkMode
          ? 'bg-gray-800 border-gray-700 text-white'
          : 'bg-white border-gray-300 text-gray-900'
          }`}
        onFocus={(e) => { e.currentTarget.style.borderColor = primaryColor; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = ''; }}
      />

      {suggestions.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {term === '' ? 'Suggestions' : 'Matching values'}
            </span>
            {matches.length > 0 && (
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {shown.length < matches.length
                  ? `Showing ${shown.length} of ${matches.length}`
                  : `${matches.length}`}
              </span>
            )}
          </div>

          {shown.length > 0 ? (
            <div className="space-y-1">
              {shown.map(suggestion => {
                const isSelected = suggestion.toLowerCase() === term;

                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onChange(suggestion)}
                    title={suggestion}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${isSelected
                      ? ''
                      : (isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700')
                      }`}
                    style={isSelected ? {
                      backgroundColor: hexToRgba(primaryColor, isDarkMode ? 0.1 : 0.05),
                      color: primaryColor,
                    } : {}}
                  >
                    <span className="truncate">{suggestion}</span>
                    {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                  </button>
                );
              })}
              {shown.length < matches.length && (
                <p className={`pt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Keep typing to narrow the list.
                </p>
              )}
            </div>
          ) : (
            <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              No matching values in the loaded records.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterTextSuggest;
