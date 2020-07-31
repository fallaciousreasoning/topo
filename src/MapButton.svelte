<script lang="ts">
  import { Control } from "ol/control";
  import { CLASS_CONTROL, CLASS_UNSELECTABLE } from "ol/css";
  import type { Map } from "ol";

  export let top: string = `0.5em`;

  class Button extends Control {
    labelNode: Text;
    button: HTMLButtonElement;

    constructor(props: { label: string }) {
      super({
        element: document.createElement("div"),
      });

      this.labelNode = document.createTextNode(props.label);
      this.button = document.createElement("button");

      this.button.appendChild(this.labelNode);
      this.element.appendChild(this.button);
      this.element.setAttribute('style', `top: ${top}; left: 0.5em`)
      this.element.classList.add(CLASS_CONTROL, CLASS_UNSELECTABLE);
    }
  }

  export let map: Map;

  let content: HTMLElement;

  const button = new Button({ label: "⬊" });

  $: if (map) map.addControl(button);
</script>
