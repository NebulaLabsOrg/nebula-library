import { retry } from "../index.js";
import { createResponse } from "../index.js";

const fx = async () => {
    try {
        const response = await retry(
            async () => {
                if (Math.random() > 0.5) {
                    return createResponse(true, "Success");
                }
                throw new Error("Fail");
            },
            5,
            1000
        );
        console.log("Final response:", response);
    } catch (error) {
        console.error("Failed after retries:", error.message);
    }
};

await fx();