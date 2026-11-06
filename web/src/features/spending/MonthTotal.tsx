import { cash, money } from '../../lib/money'

export default function MonthTotal({ total, dailyAvg, ongoing }: { total: number; dailyAvg: number; ongoing: boolean }) {
  return (
    <div className="mt-6">
      <p className="font-round text-6xl font-bold leading-none tracking-tight tabular-nums">
        {total < 0 && '−'}<span className="mr-0.5 align-top text-3xl text-mute">$</span>{money(Math.abs(total))}
      </p>
      <p className="mt-2 text-mute">
        {ongoing ? 'Spent so far' : 'Spent'}
        {total > 0 && <>, about <span className="font-semibold text-ink">{cash(dailyAvg)}</span> a day</>}
      </p>
    </div>
  )
}
