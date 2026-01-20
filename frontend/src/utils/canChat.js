export default function canChat() {
  const account = JSON.parse(sessionStorage.getItem("account"));
  return account?.RoleId === '2';
}
