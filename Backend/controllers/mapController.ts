import { Request, Response, NextFunction } from "express";
import * as turf from "@turf/turf";
import { clinet } from "../services"; 


export class mapController {
    /**
     * Get popular locations based on image density
     */
    async popularLocationNotify(req: Request, res: Response, next: NextFunction) {
        try {
            const { userEmail } = req.params;
            if (!userEmail) {
                return res.status(400).send({ error: "User email is required" });
            }
    
            const db = clinet.db("images");
    
            // ✅ Fetch only images uploaded by this user
            const images = await db.collection("metadata").find({
                uploadedBy: userEmail, 
                location: { $exists: true }
            }).toArray();
    
            if (images.length === 0) {
                return res.status(200).send({ popularLocations: [] });
            }
    
            // ✅ Convert image locations into GeoJSON Points
            const points = images.map(image =>
                turf.point([image.location.position.lng, image.location.position.lat], { tags: image.tags })
            );
    
            // ✅ Perform DBSCAN clustering with ~1km radius (0.01 degrees)
            const geoJsonPoints = turf.featureCollection(points);
            const clustered = turf.clustersDbscan(geoJsonPoints, 0.01, { minPoints: 2 });
    
            // ✅ Process clusters to find representative location & top 3 tags
            const clusterData: Record<string, { positions: number[][], tags: string[] }> = {};
            clustered.features.forEach(cluster => {
                if (!cluster.properties || cluster.properties.cluster === undefined) return;
    
                const clusterId = cluster.properties.cluster.toString();
                if (!clusterData[clusterId]) clusterData[clusterId] = { positions: [], tags: [] };
    
                clusterData[clusterId].positions.push(cluster.geometry.coordinates);
                clusterData[clusterId].tags.push(...(cluster.properties.tags || []));
            });
    
            // ✅ Compute central position & most frequent tags for each cluster
            const popularLocations = Object.values(clusterData).map(cluster => {
                // ✅ Compute average lat/lng for the cluster
                const avgPosition = cluster.positions.reduce((acc, pos) => {
                    acc[0] += pos[0];
                    acc[1] += pos[1];
                    return acc;
                }, [0, 0]).map(coord => coord / cluster.positions.length);
    
                // ✅ Count tag frequencies & get the top 3
                const tagCounts: Record<string, number> = cluster.tags.reduce((acc: Record<string, number>, tag: string) => {
                    acc[tag] = (acc[tag] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
    
                const topTags = Object.entries(tagCounts)
                    .sort((a, b) => b[1] - a[1]) // Sort by frequency
                    .slice(0, 3) // Take top 3
                    .map(tag => tag[0]);
    
                return {
                    position: { lat: avgPosition[1], lng: avgPosition[0] },
                    tags: topTags
                };
            });
    
            res.status(200).send({ popularLocations });
        } catch (error) {
            next(error);
        }
    }
}