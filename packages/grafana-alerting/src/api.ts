import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const grafanaAlertingAPI = createApi({
  reducerPath: 'grafanaAlertingAPI',
  baseQuery: fetchBaseQuery({
    baseUrl: '/apis',
  }),
  endpoints: (build) => ({}),
});

export default grafanaAlertingAPI;
