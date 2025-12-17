# OrthoNova Poly Clinic Management System

This is a comprehensive clinic management system built with React, TypeScript, and Supabase.

## Online Version

The main application connects to a Supabase backend for data storage and authentication.

### Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

## Offline Version

This repository also includes an offline version in the `orthnova-offline` folder that uses localStorage instead of Supabase, allowing it to run completely offline.

To use the offline version:
1. Navigate to the `orthnova-offline` folder
2. Build the project with `npm run build`
3. Open the `build/index.html` file directly in a browser

The offline version includes all the same features as the online version but stores all data locally in the browser.

See `orthnova-offline/README_OFFLINE.md` for more details about the offline implementation.