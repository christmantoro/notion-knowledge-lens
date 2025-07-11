import { useEffect, useState, RefObject } from "react";
import * as d3 from "d3";
import { DatabaseNode, DatabaseConnection } from "@/types/graph";
import { getCategoryColor } from "./graphConfig";

interface UseKnowledgeGraphProps {
  svgRef: RefObject<SVGSVGElement>;
  nodes: DatabaseNode[];
  connections: DatabaseConnection[];
  showConnectionLabels: boolean;
  onNodeClick?: (nodeId: string) => void;
  categoryColors: Record<string, string>;
  connectionColors: Record<string, string>;
}

export const useKnowledgeGraph = ({ svgRef, nodes, connections, showConnectionLabels, onNodeClick, categoryColors, connectionColors }: UseKnowledgeGraphProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) {
        if (svgRef.current) {
            d3.select(svgRef.current).selectAll("*").remove();
        }
        return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.attr("width", width).attr("height", height);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    const g = svg.append("g");

    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink<d3.SimulationNodeDatum, DatabaseConnection>(connections).id((d: d3.SimulationNodeDatum) => (d as DatabaseNode).id)
        .distance((d: DatabaseConnection) => {
          if (d.type === 'contains') return 60;
          if (d.type === 'relation') return 150;
          return 100;
        })
      )
      .force("charge", d3.forceManyBody()
        .strength((d: d3.SimulationNodeDatum) => {
          const node = d as DatabaseNode;
          if (node.type === 'database') return -400;
          if (node.type === 'property') return -150;
          return -300;
        })
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide()
        .radius((d: d3.SimulationNodeDatum) => {
          const node = d as DatabaseNode;
          if (node.type === 'database') return node.size + 10;
          if (node.type === 'property') return node.size + 5;
          return node.size + 5;
        })
      );

    const defs = g.append("defs");
    connections.forEach((conn, i) => {
      const gradient = defs.append("linearGradient")
        .attr("id", `gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse");
      
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", connectionColors[conn.type] || "#a8a6a1")
        .attr("stop-opacity", 0.8);
      
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", connectionColors[conn.type] || "#a8a6a1")
        .attr("stop-opacity", 0.2);
    });

    const links = g.append("g")
      .selectAll("line")
      .data(connections)
      .enter()
      .append("line")
      .attr("stroke", (d, i) => `url(#gradient-${i})`)
      .attr("stroke-width", d => {
        if (d.type === 'contains') return 2;
        if (d.type === 'relation') return Math.max(2, d.strength * 5);
        return Math.max(1, d.strength * 4);
      })
      .attr("stroke-opacity", d => d.type === 'contains' ? 0.8 : 0.6)
      .attr("stroke-dasharray", d => d.type === 'reference' ? "5,5" : null);

    const linkLabels = g.append("g")
      .selectAll("text")
      .data(connections)
      .enter()
      .append("text")
      .attr("font-size", "9px")
      .attr("fill", "#000000")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .style("opacity", showConnectionLabels ? 0.7 : 0)
      .text(d => d.label || "");

    const nodeGroups = g.append("g")
      .selectAll<SVGGElement, DatabaseNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (onNodeClick) {
          onNodeClick(d.id);
        }
      })
      .call(d3.drag<SVGGElement, DatabaseNode & d3.SimulationNodeDatum>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));
    
    const filter = defs.append("filter")
      .attr("id", "glow");
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    nodeGroups.each(function(d) {
      const group = d3.select(this);
      // Use improved color logic that falls back gracefully
      const color = categoryColors[d.category.toLowerCase()] || getCategoryColor(d.category);
      
      if (d.type === 'database' || d.type === 'page') {
        group.append("circle")
          .attr("r", d.size)
          .attr("fill", color)
          .attr("stroke", "#1e293b")
          .attr("stroke-width", 3)
          .style("filter", "url(#glow)")
          .style("opacity", 0.9);
      } else if (d.type === 'property') {
        group.append("rect")
          .attr("width", d.size * 2)
          .attr("height", d.size)
          .attr("x", -d.size)
          .attr("y", -d.size / 2)
          .attr("rx", 4)
          .attr("fill", color)
          .attr("stroke", "#1e293b")
          .attr("stroke-width", 1)
          .style("opacity", 0.8);
      }
    });

    nodeGroups.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", d => (d.type === 'database' || d.type === 'page') ? 5 : 3)
      .attr("font-size", d => (d.type === 'database' || d.type === 'page') ? "12px" : "9px")
      .attr("font-weight", d => (d.type === 'database' || d.type === 'page') ? "bold" : "normal")
      .attr("fill", "#000000")
      .text(d => {
        if (d.type === 'property' && d.name.length > 12) {
          return d.name.substring(0, 12) + '...';
        }
        return d.name;
      });

    nodeGroups
      .on("mouseenter", (event, d) => {
        setHoveredNode(d.id);
        
        const connectedNodeIds = new Set<string>();
        connectedNodeIds.add(d.id);

        links.data().forEach((conn: DatabaseConnection & { source: DatabaseNode & d3.SimulationNodeDatum, target: DatabaseNode & d3.SimulationNodeDatum }) => {
            if (conn.source.id === d.id) {
                connectedNodeIds.add(conn.target.id);
            }
            if (conn.target.id === d.id) {
                connectedNodeIds.add(conn.source.id);
            }
        });

        nodeGroups
            .style("transition", "opacity 0.3s")
            .style("opacity", 0.1);
        links
            .style("transition", "stroke-opacity 0.3s")
            .attr("stroke-opacity", 0.05);
        linkLabels
            .style("transition", "opacity 0.3s")
            .style("opacity", 0);

        nodeGroups
            .filter(node => connectedNodeIds.has(node.id))
            .style("opacity", 1);

        links
            .filter((link: DatabaseConnection & { source: DatabaseNode & d3.SimulationNodeDatum, target: DatabaseNode & d3.SimulationNodeDatum }) => link.source.id === d.id || link.target.id === d.id)
            .attr("stroke-opacity", (link: DatabaseConnection) => link.type === 'contains' ? 0.8 : 0.6);

        if (showConnectionLabels) {
            linkLabels
                .filter((link: DatabaseConnection & { source: DatabaseNode & d3.SimulationNodeDatum, target: DatabaseNode & d3.SimulationNodeDatum }) => link.source.id === d.id || link.target.id === d.id)
                .style("opacity", 0.7);
        }
        
        const element = d3.select(event.currentTarget);
        
        if (d.type === 'database' || d.type === 'page') {
          element.select("circle")
            .transition()
            .duration(200)
            .attr("r", d.size + 5)
            .style("opacity", 1);
        } else { // property
          element.select("rect")
            .transition()
            .duration(200)
            .attr("width", d.size * 2 + 4)
            .attr("height", d.size + 2)
            .attr("x", -d.size - 2)
            .attr("y", -d.size / 2 - 1)
            .style("opacity", 1);
        }
      })
      .on("mouseleave", (event, d) => {
        setHoveredNode(null);

        nodeGroups.style("opacity", 1);
        links.attr("stroke-opacity", (link: DatabaseConnection) => link.type === 'contains' ? 0.8 : 0.6);
        linkLabels.style("opacity", showConnectionLabels ? 0.7 : 0);
        
        const element = d3.select(event.currentTarget);
        
        if (d.type === 'database' || d.type === 'page') {
          element.select("circle")
            .transition()
            .duration(200)
            .attr("r", d.size)
            .style("opacity", 0.9);
        } else { // property
          element.select("rect")
            .transition()
            .duration(200)
            .attr("width", d.size * 2)
            .attr("height", d.size)
            .attr("x", -d.size)
            .attr("y", -d.size / 2)
            .style("opacity", 0.8);
        }
      });

    simulation.on("tick", () => {
      links
        .attr("x1", (d: DatabaseConnection & { source: DatabaseNode & d3.SimulationNodeDatum, target: DatabaseNode & d3.SimulationNodeDatum }) => d.source.x)
        .attr("y1", (d: DatabaseConnection & { source: DatabaseNode & d3.SimulationNodeDatum, target: DatabaseNode & d3.SimulationNodeDatum }) => d.source.y)
        .attr("x2", (d: DatabaseConnection & { source: DatabaseNode & d3.SimulationNodeDatum, target: DatabaseNode & d3.SimulationNodeDatum }) => d.target.x)
        .attr("y2", (d: DatabaseConnection & { source: DatabaseNode & d3.SimulationNodeDatum, target: DatabaseNode & d3.SimulationNodeDatum }) => d.target.y);

      linkLabels
        .attr("x", (d: DatabaseConnection & { source: DatabaseNode & d3.SimulationNodeDatum, target: DatabaseNode & d3.SimulationNodeDatum }) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: DatabaseConnection & { source: DatabaseNode & d3.SimulationNodeDatum, target: DatabaseNode & d3.SimulationNodeDatum }) => (d.source.y + d.target.y) / 2);

      nodeGroups
        .attr("transform", (d: DatabaseNode & d3.SimulationNodeDatum) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, connections, showConnectionLabels, svgRef, onNodeClick, categoryColors, connectionColors]);

  return { hoveredNode };
};
