import { localize as $l } from "@padloc/core/lib/locale.js";
import { mixins } from "../styles";
import { alert } from "../dialog.js";
import { loadScript } from "../util.js";
import { element, html, css, query } from "./base.js";
import { Dialog } from "./dialog.js";
import "./icon.js";

@element("pl-qr-dialog")
export class QRDialog extends Dialog<void, string> {
    @query("canvas")
    private _canvas: HTMLCanvasElement;

    private _video: HTMLVideoElement;

    static styles = [
        ...Dialog.styles,
        css`
            .inner {
                ${mixins.fullbleed()}
                border-radius: 0;
                max-width: 100%;
                display: flex;
                flex-direction: column;
            }

            canvas {
                flex: 1;
                object-fit: cover;
            }

            .seeker {
                ${mixins.fullbleed()}
                width: 300px;
                height: 300px;
                border: solid 3px var(--color-negative);
                border-radius: var(--border-radius);
                margin: auto;
            }
        `
    ];

    renderContent() {
        return html`
            <header>
                <pl-icon></pl-icon>
                <div class="title flex">
                    ${$l("Scan QR Code")}
                </div>
                <pl-icon class="tap" icon="close" @click=${() => this.done()}></pl-icon>
            </header>
            <canvas></canvas>
            <div class="seeker"></div>
        `;
    }

    async show() {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(
            stream => {
                // Use facingMode: environment to attemt to get the front camera on phones
                const video = (this._video = this._video || document.createElement("video"));
                video.srcObject = stream;
                video.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
                video.play();
                requestAnimationFrame(() => this._tick());
            },
            async err => {
                console.log(err);
                this.open = false;
                await alert($l("Failed to access camera! Please make sure you have granted acess!"), {
                    type: "warning"
                });
                this.done();
            }
        );

        return super.show();
    }

    done(data?: string) {
        const stream: MediaStream | null = this._video && (this._video.srcObject as MediaStream);
        if (stream) {
            for (const track of stream.getTracks()) {
                track.stop();
            }
        }

        this._video && (this._video.srcObject = null);
        super.done(data);
    }

    // _drawLine(begin, end, color) {
    //     const canvas = this._canvas.getContext("2d")!;
    //     canvas.beginPath();
    //     canvas.moveTo(begin.x, begin.y);
    //     canvas.lineTo(end.x, end.y);
    //     canvas.lineWidth = 4;
    //     canvas.strokeStyle = color;
    //     canvas.stroke();
    // }

    async _tick() {
        if (!this.open) {
            return;
        }

        if (this._video.readyState !== this._video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(() => this._tick());
            return;
        }

        const jsQR = await loadScript("/node_modules/jsqr/dist/jsQR.js", "jsQR");

        const canvas = this._canvas.getContext("2d")!;
        this._canvas.height = this._video.videoHeight;
        this._canvas.width = this._video.videoWidth;
        canvas.drawImage(this._video, 0, 0, this._canvas.width, this._canvas.height);
        const imageData = canvas.getImageData(0, 0, this._canvas.width, this._canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
        });
        if (code) {
            this.done(code.data);
        }

        requestAnimationFrame(() => this._tick());
    }
}
