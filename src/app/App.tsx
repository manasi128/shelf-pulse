import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Welcome from '../features/Welcome';
import RepLayout from '../features/rep/RepLayout';
import Today from '../features/rep/Today';
import ManagerLayout from '../features/manager/ManagerLayout';

// The manager desk (and its chart library) loads only when opened, keeping the rep app light.
const Overview = lazy(() => import('../features/manager/Overview'));
const Flags = lazy(() => import('../features/manager/Flags'));
const Territory = lazy(() => import('../features/manager/Territory'));
const Impact = lazy(() => import('../features/manager/Impact'));
import SyncScreen from '../features/rep/SyncScreen';
import OutletLayout from '../features/rep/outlet/OutletLayout';
import Brief from '../features/rep/outlet/Brief';
import Count from '../features/rep/outlet/Count';
import Talk from '../features/rep/outlet/Talk';
import Actions from '../features/rep/outlet/Actions';
import Order from '../features/rep/outlet/Order';
import Share from '../features/rep/outlet/Share';
import Godown from '../features/rep/Godown';
import Boot from './Boot';

export default function App() {
  return (
    <Boot>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/rep" element={<RepLayout />}>
          <Route index element={<Today />} />
          <Route path="godown" element={<Godown />} />
          <Route path="outlet/:outletId" element={<OutletLayout />}>
            <Route index element={<Brief />} />
            <Route path="count" element={<Count />} />
            <Route path="talk" element={<Talk />} />
            <Route path="actions" element={<Actions />} />
            <Route path="order" element={<Order />} />
            <Route path="share" element={<Share />} />
          </Route>
          <Route path="sync" element={<SyncScreen />} />
        </Route>
        <Route
          path="/manager"
          element={
            <Suspense fallback={null}>
              <ManagerLayout />
            </Suspense>
          }
        >
          <Route index element={<Overview />} />
          <Route path="flags" element={<Flags />} />
          <Route path="territory" element={<Territory />} />
          <Route path="impact" element={<Impact />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </Boot>
  );
}
