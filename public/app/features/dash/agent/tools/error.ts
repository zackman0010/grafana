
export const withErrorHandling = <T, R>(fn: (input: T) => Promise<R>): ((input: T) => Promise<R | string>) => {
    return async (input: T): Promise<R | string> => {
        try {
            return await fn(input);
        } catch (error) {
            return `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`;
        }
    };
};
