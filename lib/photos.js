import { http } from "@titanpl/surface"

export const albums = {
  list: (access_token, options = {}) => {
    const params = {
      pageSize: options.count || 20,
      pageToken: options.pageToken || undefined
    };

    const res = http.get("https://photoslibrary.googleapis.com/v1/albums", {
      params,
      headers: { Authorization: "Bearer " + access_token }
    })

    if (res.status !== 200) {
      throw new Error("Photos API error (albums.list): " + (res.data?.error?.message || JSON.stringify(res.data)));
    }

    return res.data;
  },

  get: (access_token, albumId) => {
    const res = http.get(`https://photoslibrary.googleapis.com/v1/albums/${albumId}`, {
      headers: { Authorization: "Bearer " + access_token }
    })

    if (res.status !== 200) {
      throw new Error("Photos API error (albums.get): " + (res.data?.error?.message || JSON.stringify(res.data)));
    }

    return res.data;
  }
}

export const mediaItems = {
  list: (access_token, options = {}) => {
    const params = {
      pageSize: options.count || 20,
      pageToken: options.pageToken || undefined
    };

    const res = http.get("https://photoslibrary.googleapis.com/v1/mediaItems", {
      params,
      headers: { Authorization: "Bearer " + access_token }
    })

    if (res.status !== 200) {
      throw new Error("Photos API error (mediaItems.list): " + (res.data?.error?.message || JSON.stringify(res.data)));
    }

    return res.data;
  },

  get: (access_token, mediaItemId) => {
    const res = http.get(`https://photoslibrary.googleapis.com/v1/mediaItems/${mediaItemId}`, {
      headers: { Authorization: "Bearer " + access_token }
    })

    if (res.status !== 200) {
      throw new Error("Photos API error (mediaItems.get): " + (res.data?.error?.message || JSON.stringify(res.data)));
    }

    return res.data;
  },

  search: (access_token, filters = {}) => {
    // filters: { albumId, filters: { contentFilter, dateFilter, featureFilter } }
    const res = http.post("https://photoslibrary.googleapis.com/v1/mediaItems:search", filters, {
      headers: { 
        Authorization: "Bearer " + access_token,
        "Content-Type": "application/json"
      }
    })

    if (res.status !== 200) {
      throw new Error("Photos API error (mediaItems.search): " + (res.data?.error?.message || JSON.stringify(res.data)));
    }

    return res.data;
  }
}
