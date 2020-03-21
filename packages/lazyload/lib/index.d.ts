export interface Media {
    name?: string;
    attr: string;
    px?: number;
    start?: number;
    end?: number;
}
export declare function getMedia(mediaConfig: Media[] | undefined, defaultAttr: string): Media;
export declare const lazyLoad: (dom: HTMLElement, mediaConfig: Media[], defaultAttr: string) => void;
export declare const init: ({ mediaConfig, defaultAttr, }?: {
    mediaConfig?: Media[] | undefined;
    defaultAttr?: string | undefined;
}) => void;
