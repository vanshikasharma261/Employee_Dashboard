import EmptyState from "../components/common/EmptyState";
import Icon from "../components/common/Icon";
import PageHeader from "../components/common/PageHeader";

interface PlaceholderPageProps {
  title: string;
}

/**
 * Generic "coming soon" page used by every not-yet-built menu target so
 * sidebar navigation works end-to-end in Feature 010. Each CRUD module
 * (011–015) replaces its own route with a real page.
 */
export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState
        icon={<Icon name="box" size={28} />}
        title="This module is coming soon"
        description="This screen is part of an upcoming feature. The navigation and layout are ready — functionality will arrive in a later release."
      />
    </div>
  );
}
