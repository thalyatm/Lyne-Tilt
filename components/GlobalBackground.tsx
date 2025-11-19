import React from 'react';

const GlobalBackground = () => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none bg-stone-50/50">
      {/* Main large structural circles - Made more significant with thicker borders and darker colors */}
      
      {/* Top Right Cluster */}
      <div className="absolute -top-[10%] -right-[10%] w-[800px] h-[800px] rounded-full border-[1.5px] border-stone-300/60 animate-[spin_160s_linear_infinite]"></div>
      <div className="absolute top-[5%] -right-[5%] w-[600px] h-[600px] rounded-full border border-stone-400/30 animate-[spin_120s_linear_infinite_reverse]"></div>
      
      {/* Bottom Left Cluster */}
      <div className="absolute -bottom-[20%] -left-[10%] w-[900px] h-[900px] rounded-full border-[1.5px] border-stone-300/50 animate-[spin_180s_linear_infinite]"></div>
      <div className="absolute bottom-[10%] -left-[5%] w-[500px] h-[500px] rounded-full border border-stone-400/20 animate-[spin_100s_linear_infinite_reverse]"></div>

      {/* Center/Random Accents */}
      <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full border border-stone-300/40 animate-[spin_80s_linear_infinite]"></div>
      
      {/* Straight Lines / Geometric Cuts */}
      <div className="absolute top-0 left-1/3 h-full w-px bg-stone-200/60 hidden md:block"></div>
      <div className="absolute top-0 right-1/4 h-full w-px bg-stone-200/60 hidden md:block"></div>
      
      {/* Diagonal Cut */}
      <div className="absolute top-[20%] -left-[10%] w-[120%] h-px bg-stone-200/40 rotate-12"></div>
    </div>
  );
};

export default GlobalBackground;