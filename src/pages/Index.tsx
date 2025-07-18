import { useState, useCallback } from "react";
import { useGraphData } from "@/hooks/useGraphData";
import { GraphHeader } from "@/components/GraphHeader";
import { GraphPageLayout } from "@/components/GraphPageLayout";
import { Loader2 } from "lucide-react";
import { convertGraphNodesToDatabase, convertGraphConnectionsToDatabase } from "@/utils/graphTypeConversion";

const Index = () => {
  const {
    showConnectionLabels, setShowConnectionLabels,
    connectionStrengthFilter, setConnectionStrengthFilter,
    isRealData,
    realNodes,
    isSyncing,
    isLoading,
    handleSync,
    toggleDataSource,
    usingRealData,
    filteredNodes,
    finalFilteredConnections,
    isolatedNodeCount,
    categoryColors,
    setCategoryColors,
    connectionColors,
    hasNotionApiKey,
    // Public sharing
    publicId,
    isPublic,
    shareLoading,
    togglePublicSharing,
    revokePublicLink,
  } = useGraphData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Memoize the node selection handler to prevent graph refreshing
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const searchedNodes = searchTerm
    ? filteredNodes.filter(node => 
        node.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredNodes;
  
  const searchedNodeIds = new Set(searchedNodes.map(n => n.id));

  const searchedConnections = searchTerm
    ? finalFilteredConnections.filter(conn =>
        searchedNodeIds.has(conn.source) && searchedNodeIds.has(conn.target)
      )
    : finalFilteredConnections;

  // Convert GraphNode[] and GraphConnection[] to DatabaseNode[] and DatabaseConnection[]
  const databaseNodes = convertGraphNodesToDatabase(searchedNodes);
  const databaseConnections = convertGraphConnectionsToDatabase(searchedConnections);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-notion-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-notion-black relative overflow-hidden">
      {/* Background Pattern - Notion inspired */}
      <div className="absolute inset-0 bg-white" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(35,131,226,0.05),transparent_50%)]" />
      
      <GraphHeader
        usingRealData={usingRealData}
        realDataExists={realNodes.length > 0}
        onToggleDataSource={toggleDataSource}
        isRealData={isRealData}
        hasNotionApiKey={hasNotionApiKey}
        publicId={publicId}
        isPublic={isPublic}
        shareLoading={shareLoading}
        onTogglePublicSharing={togglePublicSharing}
        onRevokePublicLink={revokePublicLink}
      />

      <GraphPageLayout
        showConnectionLabels={showConnectionLabels}
        onShowLabelsChange={setShowConnectionLabels}
        connectionStrengthFilter={connectionStrengthFilter}
        onConnectionStrengthChange={setConnectionStrengthFilter}
        nodeCount={searchedNodes.length}
        connectionCount={searchedConnections.length}
        isolatedNodeCount={isolatedNodeCount}
        isSyncing={isSyncing}
        onSync={handleSync}
        graphNodes={databaseNodes}
        graphConnections={databaseConnections}
        graphShowConnectionLabels={showConnectionLabels}
        usingRealData={usingRealData}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedNodeId={selectedNodeId}
        onNodeSelect={handleNodeSelect}
        categoryColors={categoryColors}
        onCategoryColorsChange={setCategoryColors}
        connectionColors={connectionColors}
      />
    </div>
  );
};

export default Index;