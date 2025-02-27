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
    
            // Fetch only images uploaded by this user
            const images = await db.collection("metadata").find({
                uploadedBy: userEmail, 
                location: { $exists: true }
            }).toArray();
    
            if (images.length === 0) {
                return res.status(200).send({ popularLocation: null });
            }
    
            // Convert image locations into GeoJSON Points
            const points = images.map(image =>
                turf.point([image.location.position.lng, image.location.position.lat], { tags: image.tags })
            );
    
            // ✅ Perform DBSCAN clustering with ~1km radius (0.01 degrees)
            const geoJsonPoints = turf.featureCollection(points);
            const clustered = turf.clustersDbscan(geoJsonPoints, 5.0, { minPoints: 2 });
    
            // ✅ Process clusters to find the largest one
            let largestCluster: number[][] = [];
            let mostCommonTags: string[] = [];
    
            const clusterData: Record<string, { positions: number[][], tags: string[] }> = {};
            clustered.features.forEach(cluster => {
                if (!cluster.properties || cluster.properties.cluster === undefined) return;
    
                const clusterId = cluster.properties.cluster.toString();
                if (!clusterData[clusterId]) clusterData[clusterId] = { positions: [], tags: [] };
    
                clusterData[clusterId].positions.push(cluster.geometry.coordinates);
                clusterData[clusterId].tags.push(...(cluster.properties.tags || []));
    
                // ✅ Track the largest cluster
                if (clusterData[clusterId].positions.length > largestCluster.length) {
                    largestCluster = clusterData[clusterId].positions;
                    mostCommonTags = clusterData[clusterId].tags;
                }
            });
    
            if (largestCluster.length === 0) {
                return res.status(200).send({ popularLocation: null });
            }
    
            // ✅ Compute average lat/lng for the largest cluster
            const avgPosition = largestCluster.reduce((acc, pos) => {
                acc[0] += pos[0];
                acc[1] += pos[1];
                return acc;
            }, [0, 0]).map(coord => coord / largestCluster.length);
    
            // ✅ Count tag frequencies & get the top 3
            const tagCounts: Record<string, number> = mostCommonTags.reduce((acc: Record<string, number>, tag: string) => {
                acc[tag] = (acc[tag] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
    
            const topTags = Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1]) // Sort by frequency
                .slice(0, 3) // Take top 3
                .map(tag => tag[0]);
    
            // ✅ Return only the largest cluster's location and tags
            res.status(200).send({
                popularLocation: {
                    position: { lat: avgPosition[1], lng: avgPosition[0] },
                    tags: topTags
                }
            });
        } catch (error) {
            next(error);
        }
    }
}