

let previousDataset: {
    totalShards: number
    shardCompleted: number
    date: number
} | null = null

export function calcuateEstimate(
    totalShards: number,
    shardCompleted: number,
    estimate: number
) : number {
    if( previousDataset ){
        const timeDiff = Date.now() - previousDataset.date
        const shardDiff = shardCompleted - previousDataset.shardCompleted 

        if( shardDiff >= 0 ){
            const timePerShard = timeDiff / shardDiff
            const shardsLeft = totalShards - shardCompleted
            const estimate = timePerShard * shardsLeft

            previousDataset = {
                totalShards,
                shardCompleted,
                date: Date.now()
            }
            return estimate
        }

        return estimate + timeDiff
    } else {
        previousDataset = {
            totalShards,
            shardCompleted,
            date: Date.now()
        }

        return 0
    }
}