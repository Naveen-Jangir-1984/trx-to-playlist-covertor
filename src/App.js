import React from 'react';
import Convertor from './Convertor';
import Downloader from './Downloader';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Downloader />
        <Convertor />
      </header>
    </div>
  );
}

export default App;
