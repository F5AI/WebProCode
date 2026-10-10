// Node preloads this module before loading the server entry point. Keeping the
// environment assignment in JavaScript makes `npm start` work in cmd.exe,
// PowerShell, and POSIX shells without an extra runtime dependency.
process.env.NODE_ENV = 'production';
