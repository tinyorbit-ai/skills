export interface ProductRelease {
  id: string;
  releasedAt: string;
  current: boolean;
}

export interface ReleaseSwitcherState {
  releases: ProductRelease[];
  initialVisibleIndex: number;
  visibleReleaseIds: string[];
}

export function openReleaseSwitcher(
  releases: ProductRelease[],
): ReleaseSwitcherState {
  const sortedReleases = [...releases].sort((left, right) =>
    left.releasedAt.localeCompare(right.releasedAt),
  );
  return {
    releases: sortedReleases,
    initialVisibleIndex: 0,
    visibleReleaseIds: sortedReleases.slice(0, 3).map((release) => release.id),
  };
}
