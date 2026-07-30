<<<<<<< HEAD
# ContextBell - Local Development Guide

This is the main ContextBell project (Vite + React + Express). It has been configured to run on your laptop with minimal setup.

## Features
- **Enhanced UI**: Includes the polished ContextBell components and animations.
- **Zero-Config Database**: Automatically falls back to a mock data store if no MySQL database is provided.
- **Developer Auth**: Automatically logs you in as a developer user for local testing.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```
    *(If you don't have pnpm, you can use `npm install`)*

2.  **Environment Setup**:
    A `.env` file has been created for you with default values. You don't need to change anything to get started.

3.  **Run the App**:
    ```bash
    pnpm dev
    ```

4.  **Open in Browser**:
    Visit [http://localhost:3000](http://localhost:3000).

## Project Structure
- `client/`: React frontend (Vite).
- `server/`: Express backend with tRPC.
- `shared/`: Shared types and constants.
- `contextbell/`: (Optional) Original Next.js project folder.

## AI Features
The app will attempt to use the Manus Forge API for AI explanations and summaries. If no API key is provided in `.env`, it will fallback to helpful mock responses.
=======
# Context-Bell-
This is my hackathon based project based on clering users confusion point 
>>>>>>> 5166b233ad9d764f96b4f1a328b6d7b2b97366e3
hello