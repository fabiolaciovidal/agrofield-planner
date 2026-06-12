import React from 'react';
import { View } from '../types';

interface BottomNavProps {
  currentView: View;
  setView: (view: View) => void;
  isCommercialAdmin?: boolean;
}

const NavItem: React.FC<{
  label: string;
  // Fix: Changed JSX.Element to React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
      isActive ? 'text-green-600' : 'text-gray-500 hover:text-green-500'
    }`}
  >
    {icon}
    <span className="text-xs">{label}</span>
  </button>
);

const HomeIcon = ({className}: {className: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const CalendarIcon = ({className}: {className: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const UsersIcon = ({className}: {className: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A10.004 10.004 0 0012 10.5M12 4.354a4 4 0 110 5.292" /></svg>;
const CogIcon = ({className}: {className: string}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, isCommercialAdmin = false }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-t-md z-10">
      <div className="max-w-4xl mx-auto flex justify-around">
        <NavItem
          label="Panel"
          icon={<HomeIcon className="h-6 w-6 mb-1"/>}
          isActive={currentView === View.DASHBOARD}
          onClick={() => setView(View.DASHBOARD)}
        />
        <NavItem
          label="Agenda"
          icon={<CalendarIcon className="h-6 w-6 mb-1"/>}
          isActive={currentView === View.PLANNER}
          onClick={() => setView(View.PLANNER)}
        />
        <NavItem
          label="Clientes"
          icon={<UsersIcon className="h-6 w-6 mb-1"/>}
          isActive={currentView === View.CLIENTS}
          onClick={() => setView(View.CLIENTS)}
        />
        {isCommercialAdmin && (
          <NavItem
            label="Admin"
            icon={<CogIcon className="h-6 w-6 mb-1"/>}
            isActive={[View.ADMIN_HOME, View.ADMIN_COMMERCIAL, View.ADMIN_USERS, View.ADMIN_IMPORT].includes(currentView)}
            onClick={() => setView(View.ADMIN_HOME)}
          />
        )}
      </div>
    </div>
  );
};

export default BottomNav;
