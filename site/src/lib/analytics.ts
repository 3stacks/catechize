// The loader lives in shared/, so that the app's tests can check its copy in
// index.html without the site (the Docker build has no site/ folder).
export { ANALYTICS_LOADER } from '../../../shared/analytics-loader'
