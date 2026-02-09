# Unique ID Generator (Snowflake)

A high-performance, distributed unique ID generator implemented in TypeScript using the [Twitter Snowflake](https://blog.twitter.com/engineering/en_us/a/2010/announcing-snowflake) algorithm. This project uses [Bun](https://bun.sh) as the Javascript runtime.

## 🚀 Features

- **Unique**: Generates globally unique 64-bit integers.
- **Time-Sortable**: IDs are roughly sorted by creation time.
- **Distributed**: Supports multiple machines and datacenters (up to 32 datacenters x 32 machines).
- **High Performance**: Can generate up to 4096 unique IDs per millisecond per node.

## 🏗 Architecture

The 64-bit ID is composed of:

- **1 bit**: Sign bit (unused, always 0).
- **41 bits**: Timestamp (milliseconds since custom epoch).
- **5 bits**: Datacenter ID.
- **5 bits**: Machine ID.
- **12 bits**: Sequence number (resets every millisecond).

## 🛠 Prerequisites

- [Bun](https://bun.sh) (v1.0 or later)

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd unique-id-generator
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

## 🏃‍♂️ Usage

1. Start the server:
   ```bash
   bun run src/index.ts
   ```
   The server will start on port `3000` (default).

2. Generate an ID:
   Send a GET request to the `/get_id` endpoint.

   ```bash
   curl http://localhost:3000/get_id
   ```

   **Response:**
   ```json
   {
     "id": "7420100185911767040"
   }
   ```

## 📂 Project Structure

- `src/Snowflake.ts`: Core ID generation logic.
- `src/index.ts`: HTTP server using Bun.serve.
- `src/db.ts`: Mock database simulation for cluster configuration.

## ⚙️ Configuration

- **Epoch**: logic uses a custom epoch defined in `Snowflake.ts`.
- **Machine/Datacenter**: IDs are fetched from `db.ts` to simulate environment configuration.
