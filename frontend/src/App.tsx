import { ForecastProvider } from './context/ForecastContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import './styles/dashboard.css';

export function App() {
  return (
    <ForecastProvider>
      <DashboardLayout />
    </ForecastProvider>
  );
}

export default App;
