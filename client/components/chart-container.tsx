interface ChartContainerProps {
  title: string
  data: Array<{ name: string; value: number }>
}

export function ChartContainer({ title, data }: ChartContainerProps) {
  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className="text-xs text-gray-500">Last 7 days</span>
      </div>
      <div className="flex items-end justify-between h-32 gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center gap-2 flex-1">
            <div className="w-full bg-gray-200 rounded-t-sm relative flex items-end justify-center min-h-[80px]">
              <div
                className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 flex items-end justify-center"
                style={{ height: `${(item.value / maxValue) * 80}px` }}
              >
                <span className="text-xs text-white font-medium mb-1">{item.value}</span>
              </div>
            </div>
            <span className="text-xs text-gray-600 font-medium">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 