import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function PriceHistoryChart({ data, currentPrice }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="section-label">30-DAY PRICE HISTORY</div>
        <p className="muted" style={{ padding: '40px 0', textAlign: 'center' }}>No price history available.</p>
      </div>
    );
  }

  // Find min and max for Y-axis domain to make the graph look dynamic
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Calculate padding for Y-axis
  const padding = (maxPrice - minPrice) * 0.1 || currentPrice * 0.1;
  const domain = [Math.max(0, Math.floor(minPrice - padding)), Math.ceil(maxPrice + padding)];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#1E1E1E', border: '1px solid #3A3A3A', padding: '8px 12px', borderRadius: '6px' }}>
          <p style={{ color: '#8A8682', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
          <p style={{ color: '#F0EDE8', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
            ₹{payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card price-history-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="section-label" style={{ marginBottom: 0 }}>30-DAY PRICE HISTORY</div>
        <div style={{ fontSize: '13px', color: currentPrice <= minPrice ? '#22C55E' : '#EAB308' }}>
          {currentPrice <= minPrice ? '↓ Best time to buy' : '↑ Price is high'}
        </div>
      </div>
      
      <div style={{ height: '200px', width: '100%', marginLeft: '-20px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#555250" 
              fontSize={11} 
              tickMargin={10} 
              axisLine={false} 
              tickLine={false} 
              minTickGap={30}
            />
            <YAxis 
              domain={domain} 
              stroke="#555250" 
              fontSize={11} 
              tickFormatter={(val) => `₹${val}`} 
              axisLine={false} 
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#F5A623" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
