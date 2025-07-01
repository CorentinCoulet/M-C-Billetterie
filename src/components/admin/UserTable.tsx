import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Shield, Trash2, UserIcon } from "lucide-react";

interface UserType {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isVerified: boolean;
  createdAt: Date;
  blocked?: { id: string } | null;
  _count?: {
    orders: number;
    tickets: number;
  };
}

interface UserTableProps {
  users: UserType[];
}

export function UserTable({ users }: UserTableProps) {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="destructive" className="text-xs">Admin</Badge>;
      case 'ORGANIZER':
        return <Badge variant="default" className="text-xs">Organisateur</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Utilisateur</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          Gestion des utilisateurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Utilisateur</th>
                <th className="text-left p-3 font-medium">Rôle</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Inscription</th>
                <th className="text-left p-3 font-medium">Commandes</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{user.name || 'Sans nom'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <Badge 
                        variant={user.isVerified ? "default" : "secondary"}
                        className="text-xs w-fit"
                      >
                        {user.isVerified ? 'Vérifié' : 'Non vérifié'}
                      </Badge>
                      {user.blocked && (
                        <Badge variant="destructive" className="text-xs w-fit">
                          Bloqué
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="p-3 text-sm">
                    {user._count?.orders || 0} commandes
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
