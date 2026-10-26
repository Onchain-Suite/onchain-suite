import { DiagramSketch } from "@/onchain-suite-website/components/retention-playbook/sketch/diagrams";
import type { Diagram } from "@/onchain-suite-website/types/retention-playbook";
import { seedFrom } from "@/onchain-suite-website/utils/sketch";

const centreLine = (c: { label: string; note?: string }) =>
  c.note ? `${c.label}: ${c.note}` : c.label;

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
    case "hub": {
      const way = { in: "into", out: "out of", both: "to and from" };
      return [
        centreLine(diagram.centre),
        ...diagram.spokes.map(
          (sp) =>
            `${sp.label}, ${way[sp.dir ?? "in"]} ${diagram.centre.label}${sp.note ? `: ${sp.note}` : ""}`
        ),
      ];
    }
    case "funnel":
      return diagram.stages.map((st) => `${st.label}: ${st.note}`);
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
