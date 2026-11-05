import { handler } from '../server.js';
export default async function api(req, res) {
  return handler(req, res);
}
