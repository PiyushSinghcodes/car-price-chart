import React from 'react';
import CarPriceChart from './components/CarPriceChart';

const App = () => {
  return (
    <div style={{ 
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <h1>Car Price Analysis</h1>
      <CarPriceChart />
    </div>
  );
};

export default App;
