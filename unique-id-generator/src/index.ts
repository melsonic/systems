import { Snowflake } from './Snowflake';
import { Database } from './db';

const { machine_id, datacenter_id } = Database.getClusterDetails();
const generator = new Snowflake(machine_id, datacenter_id);

const port = parseInt(process.env.PORT || "3000");

const server = Bun.serve({
    port,
    fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/get_id") {
            return Response.json({
                id: generator.getSnowFlakeId().toString(),
            });
        }
        return new Response("Not Found", { status: 404 });
    },
});

console.log(`Server is listening on port ${server.port}`);
