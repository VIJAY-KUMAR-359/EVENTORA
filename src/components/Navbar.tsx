import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut, User, PlusCircle, LayoutDashboard, CalendarDays, ClipboardList, Moon, Sun, ShieldAlert } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import logo from '@/assets/logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const isAdmin = user?.email?.toLowerCase() === 'vijaykumareppili24@gmail.com';

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Eventora" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-xl font-bold text-foreground">EVENTORA</span>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link to="/create-event">
                  <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Create Event
                  </Button>
                </Link>

                <NotificationBell />

                <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10 border-2 border-primary">
                        {user.profile_pic_url && <AvatarImage src={user.profile_pic_url} alt={user.name} />}
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">User</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/my-events')}>
                      <CalendarDays className="mr-2 h-4 w-4" /> My Events
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/my-registrations')}>
                      <ClipboardList className="mr-2 h-4 w-4" /> My Registrations
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" /> My Profile
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <ShieldAlert className="mr-2 h-4 w-4" /> Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
                <Link to="/login"><Button variant="ghost">Login</Button></Link>
                <Link to="/register"><Button>Register</Button></Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {user && <NotificationBell />}
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <button className="p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-3">
              {user ? (
                <>
                  <div className="px-4 py-2 flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-primary">
                      {user.profile_pic_url && <AvatarImage src={user.profile_pic_url} alt={user.name} />}
                      <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">User</p>
                    </div>
                  </div>
                  <div className="border-t border-border my-2" />
                  <Link to="/" className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  <Link to="/my-events" className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    <CalendarDays className="h-4 w-4" /> My Events
                  </Link>
                  <Link to="/my-registrations" className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    <ClipboardList className="h-4 w-4" /> My Registrations
                  </Link>
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    <User className="h-4 w-4" /> My Profile
                  </Link>
                  <Link to="/create-event" className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    <PlusCircle className="h-4 w-4" /> Create Event
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                      <ShieldAlert className="h-4 w-4" /> Admin Panel
                    </Link>
                  )}
                  <div className="border-t border-border pt-3 mt-2 px-4">
                    <Button variant="outline" size="sm" onClick={handleLogout} className="w-full text-destructive hover:text-destructive">
                      <LogOut className="h-4 w-4 mr-1" /> Logout
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-4 pt-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Login</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Register</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
