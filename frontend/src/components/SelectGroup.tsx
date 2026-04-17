interface Option<T extends string> {
  value: T
  label: string
  desc?: string
}

interface SelectGroupProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  columns?: 2 | 3 | 4
}

export function SelectGroup<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: SelectGroupProps<T>) {
  const gridCols =
    columns === 2
      ? 'grid-cols-2'
      : columns === 4
      ? 'grid-cols-4'
      : 'grid-cols-3'

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg border-2 px-4 py-3 text-left transition-all ${
              isSelected
                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div
              className={`text-sm font-medium ${
                isSelected ? 'text-indigo-700' : 'text-gray-700'
              }`}
            >
              {option.label}
            </div>
            {option.desc && (
              <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
            )}
          </button>
        )
      })}
    </div>
  )
}
