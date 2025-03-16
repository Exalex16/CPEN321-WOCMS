import { Request, Response } from "express";
import * as turf from "@turf/turf";
import { clinet } from "../services"; 
import type { Feature, Point } from "geojson";



export class mapController {
    /**
     * Get popular locations based on image density
     */
    getRecommendation = async (req: Request, res: Response) => {
        const { userEmail } = req.params;

        const db = clinet.db("images");

        // Fetch only images uploaded by this user
        const images = await db.collection("metadata").find({
            uploadedBy: userEmail, 
            location: { $exists: true }
        }).toArray();

        if (images.length === 0) {
            // console.log(`No images found for user: ${userEmail}.`);
            return res.status(200).send({ popularLocation: null, message: "No images uploaded. Cannot generate recommendation." });
        }

        // Filter out invalid lat/lng values
        const points = images
            .filter(img => 
                typeof img.location?.position?.lat === "number" && 
                typeof img.location?.position?.lng === "number"
            )
            .map(image => {
                let lat = parseFloat(String(image.location.position.lat));
                let lng = parseFloat(String(image.location.position.lng));


                // Remove bad coordinates
                if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
                    // console.log(`Skipping invalid location: lat=${lat}, lng=${lng}`);
                    return null;
                }

                const pointFeature: Feature<Point, { imageData: Record<string, unknown> }> = turf.point(
                    [lng, lat], 
                    { imageData: image as Record<string, unknown> }
                );
                // Ensure that the pointFeature is valid before returning
                if (!pointFeature || !pointFeature.geometry || !pointFeature.geometry.coordinates) {
                    throw new Error("Invalid point feature generated.");
                }

                return pointFeature;

            })
            .filter(point => point !== null);

        // console.log("Cleaned Image Locations:", points);

        if (points.length === 0) {
            // console.log(`All images for ${userEmail} had invalid coordinates.`);
            return res.status(200).send({ popularLocation: null, message: "No valid image locations found. Cannot generate recommendation." });
        }

        // console.log("Input Coordinates for DBSCAN:", points.map(pt => pt.geometry.coordinates));

        // Cluster only by location (`epsilon = 2.0` to merge nearby locations)
        const geoJsonPoints = turf.featureCollection(points);
        const clustered = turf.clustersDbscan(geoJsonPoints, 100.0, { minPoints: 1 });

        // console.log("DBSCAN Cluster Results:", JSON.stringify(clustered, null, 2));

        // Track the largest cluster
        let largestClusterId = "";
        let largestClusterSize = 0;
        let largestCluster: [number, number][] = [];

        const clusterData = new Map<string, { positions: [number, number][], tags: string[] }>();

        clustered.features.forEach(cluster => {
            if (!cluster.properties || cluster.properties.cluster === undefined) return;

            const clusterId = String(cluster.properties.cluster);

            if (!clusterData.has(clusterId)) {
                clusterData.set(clusterId, { positions: [], tags: [] });
            }

            const clusterEntry = clusterData.get(clusterId);
            if (clusterEntry) {
                const coords = cluster.geometry.coordinates;
                if (Array.isArray(coords) && coords.length === 2) {
                    clusterEntry.positions.push([Number(coords[0]), Number(coords[1])]);
                }
                const tags: string[] = Array.isArray(cluster.properties.imageData.tags)
                    ? cluster.properties.imageData.tags.filter((tag: unknown): tag is string => typeof tag === "string")
                    : [];
                clusterEntry.tags.push(...tags);
            }

            const clusterSize = clusterEntry?.positions.length ?? 0;
            if (clusterSize > largestClusterSize) {
                largestClusterSize = clusterSize;
                largestClusterId = clusterId;
            }
        });

        // Get the largest cluster's data
        largestCluster = clusterData.get(largestClusterId)?.positions ?? [];
        const allTagsInLargestCluster = clusterData.get(largestClusterId)?.tags ?? [];

        // Compute average lat/lng for the largest cluster
        const avgPosition: [number, number] = largestCluster.reduce(
            (acc: [number, number], pos: [number, number]) => {
                acc[0] += pos[0]; 
                acc[1] += pos[1]; 
                return acc;
            },
            [0, 0]
        ).map((coord: number) => coord / (largestCluster.length || 1)) as [number, number];

        // Count tag frequencies & get the top 3
        const tagCounts = new Map<string, number>();
        allTagsInLargestCluster.forEach(tag => {
            // tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        });

        const topTags = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag]) => tag);

        // Return only the largest cluster's location and tags
        res.status(200).send({
            popularLocation: {
                position: { lat: avgPosition[1], lng: avgPosition[0] },
                tags: topTags
            }
        });
    }
}