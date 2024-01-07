export default class Loader {
    static assets: any = {}
    static promises: Array<Promise<unknown>>
    static async loadAll(srcs: Array<string>) {
        await new Promise(async (resolve) => {
            const arr = srcs.map((src, index) => {
                return new Promise((res) => {
                    const image = new Image()
                    image.src = src
                    image.addEventListener('load', () => {
                        Loader.assets[src] = image
                        res(index)
                    })
                })
            })
            Loader.promises = arr
            await Promise.allSettled(arr).then((value) => {
                resolve("done")
                console.log(value)
            })
        })
    }
    static get(src: string) {
        return Loader.assets[src]
    }
}