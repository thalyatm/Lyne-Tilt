import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { stage: 'Week 1', clarity: 20, momentum: 10 },
  { stage: 'Week 2', clarity: 45, momentum: 25 },
  { stage: 'Week 3', clarity: 60, momentum: 50 },
  { stage: 'Week 4', clarity: 85, momentum: 80 },
  { stage: 'Month 3', clarity: 95, momentum: 90 },
];

const ImpactChart = () => {
  return (
    <div className="w-full h-64 md:h-80 bg-white p-4 rounded-sm border border-stone-100">
      <h4 className="text-center font-serif text-stone-800 mb-4">Client Growth Trajectory</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="stage" stroke="#78716c" fontSize={12} tickLine={false} />
          <YAxis stroke="#78716c" fontSize={12} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', fontFamily: 'serif' }}
            itemStyle={{ color: '#57534e' }}
          />
          <Line type="monotone" dataKey="clarity" stroke="#8d3038" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Clarity" />
          <Line type="monotone" dataKey="momentum" stroke="#57534e" strokeWidth={2} dot={{ r: 4 }} name="Momentum" />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-center text-stone-400 mt-2">Typical results from "The Artist's Path" program</p>
    </div>
  );
};

export default ImpactChart;