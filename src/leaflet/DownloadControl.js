import L from 'leaflet';
import { TileDownloader } from '../utils/tileDownloader';

const DownloadControl = L.Control.extend({
    options: {
        position: 'topleft',
        layer: undefined,
        icon: 'fa fa-download',
        /**
        * This callback can be used in case you would like to override button creation behavior.
        * This is useful for DOM manipulation frameworks such as angular etc.
        * This function should return an object with HtmlElement for the button (link property) and the icon (icon property).
        */
        createButtonCallback: function (container, options) {
            var link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single', container);
            link.title = options.strings.title;
            var icon = L.DomUtil.create(options.iconElementTag, options.icon, link);
            return { link: link, icon: icon };
        },
        strings: {
            title: "Make available offline"
        }
    },

    /**
       * Add control to map. Returns the container for the control.
       */
    onAdd: function (map) {
        var container = L.DomUtil.create('div',
            'leaflet-control-download leaflet-bar leaflet-control');

        this._layer = this.options.layer || new L.LayerGroup();
        this._layer.addTo(map);

        var linkAndIcon = this.options.createButtonCallback(container, this.options);
        this._link = linkAndIcon.link;
        this._icon = linkAndIcon.icon;

        L.DomEvent
            .on(this._link, 'click', L.DomEvent.stopPropagation)
            .on(this._link, 'click', L.DomEvent.preventDefault)
            .on(this._link, 'click', this._onClick, this)
            .on(this._link, 'dblclick', L.DomEvent.stopPropagation);

        return container;
    },

    /**
        * This method is called when the user clicks on the control.
        */
    _onClick: function () {
        const zoom = map.getZoom();

        if (zoom < 11)
          return;


        const downloader = new TileDownloader(map.getBounds(), zoom);
        const shouldDownload = confirm(`Download tiles? This will use about ${Math.ceil(downloader.estimatedSize() / 1024 / 1024)}MB of storage`);

        if (!shouldDownload)
          return;

        const layers = []
        map.eachLayer(l => {
            if (!(l instanceof L.TileLayer))
              return;

            layers.push(l);
        });

        downloader.downloadTiles(layers[0]._url).then(() => alert("Done!"));
    }
});

L.control.download = function (options) {
    return new DownloadControl(options);
}