export { portableRouteContract as routeContract } from "../../../contracts/portable";

export const GET = () => Response.json({ portable: true });
