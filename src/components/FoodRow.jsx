export default function FoodRow({ item }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '8px 16px', borderBottom: '1px solid var(--line)'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'var(--txt)' }}>{item.name}</div>
        <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 1 }}>
          P {Math.round(item.protein || 0)}g · C {Math.round(item.carbs || 0)}g · F {Math.round(item.fat || 0)}g
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>
        {item.kcal} kcal
      </div>
    </div>
  )
}
