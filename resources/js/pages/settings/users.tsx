import { Head, router } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
    email_verified_at: string | null;
    created_at: string;
};

export default function Users({ users }: { users: ManagedUser[] }) {
    return (
        <>
            <Head title="User management" />

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="User management"
                    description="Change roles and review who can manage the workspace."
                />

                <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-950">Accounts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                            <div className="font-semibold">Default admin account</div>
                            <div>Email: admin@example.com</div>
                            <div>Password: password</div>
                        </div>

                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                            >
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold text-slate-950">{user.name}</h3>
                                        <Badge
                                            className={
                                                user.role === 'admin'
                                                    ? 'border-emerald-200 bg-emerald-100 text-emerald-900'
                                                    : 'border-slate-200 bg-white text-slate-700'
                                            }
                                        >
                                            {user.role}
                                        </Badge>
                                        <Badge
                                            className={
                                                user.email_verified_at
                                                    ? 'border-sky-200 bg-sky-100 text-sky-900'
                                                    : 'border-amber-200 bg-amber-100 text-amber-900'
                                            }
                                        >
                                            {user.email_verified_at ? 'verified' : 'unverified'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-700">{user.email}</p>
                                    <p className="text-xs text-slate-500">
                                        Joined {new Date(user.created_at).toLocaleDateString()}
                                    </p>
                                </div>

                                <Select
                                    value={user.role}
                                    onValueChange={(value: 'admin' | 'user') => {
                                        router.put(
                                            `/settings/users/${user.id}`,
                                            { role: value },
                                            { preserveScroll: true },
                                        );
                                    }}
                                >
                                    <SelectTrigger className="w-40 border-slate-300 bg-white text-slate-950">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="user">User</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Users.layout = {
    breadcrumbs: [
        {
            title: 'User management',
            href: '/settings/users',
        },
    ],
};
