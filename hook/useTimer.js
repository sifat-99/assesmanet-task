import { useCallback, useEffect, useRef, useState } from "react";

export const useTimer = (initialTime, onTimeUp) => {
    const [timeLeft, setTimeLeft] = useState(initialTime);
    const timeRef = useRef(null);

    const startTimer = useCallback(() => {
        if (timeRef.current) clearInterval(timeRef.current);
        setTimeLeft(initialTime);
        timeRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timeRef.current);
                    onTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000)
    }, [initialTime, onTimeUp])
    const stopTimer = useCallback(() => {
        if (timeRef.current) {
            clearInterval(timeRef.current)
            timeRef.current = null;
        }
    }, [])

    const resetTimer = useCallback(() => {
        stopTimer();
        setTimeLeft(initialTime);

    }, [initialTime, stopTimer])

    useEffect(() => {
        return stopTimer();
    }, [stopTimer])

    return { timeLeft, startTimer, stopTimer, resetTimer };
}
