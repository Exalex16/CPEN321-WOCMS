import { Request, Response, NextFunction } from "express";
import * as turf from "@turf/turf";
import { clinet } from "../services"; 


export class mapController {
    /**
     * Get popular locations based on image density
     */
    async getRecommendation(req: Request, res: Response, next: NextFunction) {
        const { userEmail } = req.params;

        const db = clinet.db("images");

        // Fetch only images uploaded by this user
        const images = await db.collection("metadata").find({
            uploadedBy: userEmail, 
            location: { $exists: true }
        }).toArray();

        if (images.length === 0) {
            console.log(`No images found for user: ${userEmail}.`);
            return res.status(200).send({ popularLocation: null, message: "No images uploaded. Cannot generate recommendation." });
        }

        // Filter out invalid lat/lng values
        const points = images
            .filter(img => img.location?.position?.lat && img.location?.position?.lng)
            .map(image => {
                let lat = parseFloat(image.location.position.lat);
                let lng = parseFloat(image.location.position.lng);

                // Remove bad coordinates
                if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
                    // console.log(`Skipping invalid location: lat=${lat}, lng=${lng}`);
                    return null;
                }

                return turf.point([lng, lat], { imageData: image });
            })
            .filter(point => point !== null);

        // console.log("Cleaned Image Locations:", points);

        if (points.length === 0) {
            console.log(`All images for ${userEmail} had invalid coordinates.`);
            return res.status(200).send({ popularLocation: null, message: "No valid image locations found. Cannot generate recommendation." });
        }

        console.log("Input Coordinates for DBSCAN:", points.map(pt => pt.geometry.coordinates));

        // Cluster only by location (`epsilon = 2.0` to merge nearby locations)
        const geoJsonPoints = turf.featureCollection(points);
        const clustered = turf.clustersDbscan(geoJsonPoints, 100.0, { minPoints: 1 });

        console.log("DBSCAN Cluster Results:", JSON.stringify(clustered, null, 2));

        // Track the largest cluster
        let largestClusterId: string | null = null;
        let largestClusterSize = 0;
        let largestCluster: any[] = [];

        const clusterData: Record<string, { positions: number[][], tags: string[] }> = {};
        clustered.features.forEach(cluster => {
            if (!cluster.properties || cluster.properties.cluster === undefined) return;

            const clusterId = cluster.properties.cluster.toString();
            if (!clusterData[clusterId]) clusterData[clusterId] = { positions: [], tags: [] };

            clusterData[clusterId].positions.push(cluster.geometry.coordinates);
            clusterData[clusterId].tags.push(...cluster.properties.imageData.tags);

            const clusterSize = clusterData[clusterId].positions.length;
            if (clusterSize > largestClusterSize) {
                largestClusterSize = clusterSize;
                largestClusterId = clusterId;
            }
        });

        // Get the largest cluster's data
        largestCluster = largestClusterId ? clusterData[largestClusterId].positions : [];
        const allTagsInLargestCluster = largestClusterId ? clusterData[largestClusterId].tags : [];

        // Compute average lat/lng for the largest cluster
        const avgPosition: [number, number] = largestCluster.reduce(
            (acc: [number, number], pos: [number, number]) => {
                acc[0] += pos[0]; 
                acc[1] += pos[1]; 
                return acc;
            },
            [0, 0]
        ).map((coord: number) => coord / largestCluster.length) as [number, number];

        // Count tag frequencies & get the top 3
        const tagCounts: Record<string, number> = allTagsInLargestCluster.reduce((acc: Record<string, number>, tag: string) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1]) 
            .slice(0, 3) 
            .map(tag => tag[0]);

        // Return only the largest cluster's location and tags
        res.status(200).send({
            popularLocation: {
                position: { lat: avgPosition[1], lng: avgPosition[0] },
                tags: topTags
            }
        });
    }
}