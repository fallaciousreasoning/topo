import * as React from 'react'
import db from '../caches/indexeddb'
import { runDownload } from '../tilebundle/resume'

/**
 * On app load, pick back up any downloads that were still running when the app was last closed
 * (e.g. a page reload or crash mid-download), rather than leaving them stuck at 'downloading' forever.
 */
export default function ResumeDownloads() {
    React.useEffect(() => {
        db.getDownloads().then(downloads => {
            for (const download of downloads) {
                if (download.status === 'downloading') {
                    runDownload(download)
                }
            }
        })
    }, [])

    return null
}
