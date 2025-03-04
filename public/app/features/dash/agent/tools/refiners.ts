import { getDatasourceSrv } from "app/features/plugins/datasource_srv";

export const regexRefiner = {
    func: (regex?: string) => {
        if (!regex) {
            return true;
        }
        try {
            new RegExp(regex);
            return true;
        } catch (error) {
            return false;
        }
    },
    message: 'Invalid regex pattern; should be a valid javascript regex pattern',
};

export const datasourceTypeRefiner = function (types: string[]) {
    return {
        func: (uid?: string) => {
            const datasources = getDatasourceSrv().getAll();
            const datasource = datasources.find((ds) => ds.uid === uid);
            if (!datasource) {
                return false;
            }
            return types.includes(datasource.type);
        },
        message: `Invalid datasource type; should be one of type: '${types.join(', ')}'`,
    }
};
export const lokiTypeRefiner = datasourceTypeRefiner(['loki']);
export const prometheusTypeRefiner = datasourceTypeRefiner(['prometheus']);
export const lokiOrPrometheusTypeRefiner = datasourceTypeRefiner(['loki', 'prometheus']);

export const unixTimestampRefiner = {
    func: (timestamp?: number) => {
        // make sure `timestamp` is reasonable (between 1 years ago and 1 years from now)
        const now = Date.now();
        const oneYearAgo = now - 31536000000;
        const oneYearFromNow = now + 31536000000;
        return typeof timestamp === 'number' && timestamp > oneYearAgo && timestamp < oneYearFromNow;
    },
    message: 'Invalid unix timestamp; should be a millisecond unix timestamp between 1 year ago and 1 year from now',
};
