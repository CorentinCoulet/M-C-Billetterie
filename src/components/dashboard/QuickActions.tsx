import { NavigationItem } from '@/types/dashboard';

interface QuickActionsProps {
  actions: NavigationItem[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <a
              key={index}
              href={action.href}
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200"
            >
              <div className="flex-shrink-0">
                <IconComponent className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {action.name}
                </p>
                {action.badge && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                    {action.badge}
                  </span>
                )}
              </div>
              {action.count !== undefined && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-blue-600 bg-blue-100 rounded-full">
                    {action.count > 99 ? '99+' : action.count}
                  </span>
                </div>
              )}
              <div className="flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
