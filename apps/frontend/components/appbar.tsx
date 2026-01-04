import Logo from "./logo";
import { ProfileMenu } from "./profile-menu";

export default function AppBar() {
  return (
    <header className="flex items-center justify-between px-8 h-14 border-b">
      <Logo />
      <ProfileMenu />
    </header>
  );
}
