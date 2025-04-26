(async() => {
    const data = {
        "uniqueId" : "19670610b3c",
        "shardIndex" : 2,
    }
    const res = await fetch('http://192.168.2.164:8771/stream/shard',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }
    )
    const json = await res.json()
    console.log(json)
})()