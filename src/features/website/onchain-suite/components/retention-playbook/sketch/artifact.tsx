import { DiagramSketch } from "@/onchain-suite-website/components/retention-playbook/sketch/diagrams";
import type { Diagram } from "@/onchain-suite-website/types/retention-playbook";
import { seedFrom } from "@/onchain-suite-website/utils/sketch";

/** Plain-text version of a diagram for screen readers. */
function describe(diagram: Diagram): string[] {
  switch (diagram.type) {
    case "ladder":
      return diagram.steps.map((s) => `${s.label}: ${s.note}`);
    case "flow":
      return diagram.nodes.map((n) =>
        n.note ? `${n.label}: ${n.note}` : n.label
      );
    case "timeline":
      return diagram.points.map((p) => `${p.when}: ${p.label}`);
    case "stack":
      return diagram.layers.map((l) => `${l.label}: ${l.note}`);
  }
}

/**
 * A hand-drawn diagram on graph paper, with no visible caption. The drawing
 * is decorative to assistive tech; a hidden caption carries its title and
 * the same content as a list. `code` only seeds the pen wobble.
 */
export function Artifact({
  code,
  title,
  diagram,
}: {
  code: string;
  title: string;
  diagram: Diagram;
}) {
  return (
    <figure className="rp-artifact" data-draw>
      <div className="rp-art-paper">
        <DiagramSketch diagram={diagram} seed={seedFrom(code)} />
      </div>
      <figcaption className="sr-only">
        {title}
        <ul>
          {describe(diagram).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
