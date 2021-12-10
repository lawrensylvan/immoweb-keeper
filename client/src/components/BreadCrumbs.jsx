import { HomeFilled } from '@ant-design/icons';
import { Breadcrumb } from 'antd'
import { useLocation } from 'react-router';
import { Link } from 'react-router-dom';

const breadcrumbNameMap = {
    '/explore':         'Explore',
    '/explore/advanced-search':         'Advanced search',
    '/flagged-items':   'Flagged items',
    '/flagged-items/liked-estates':   'Liked estates'
}

export default function BreadCrumbs() {

    const location = useLocation()
    const pathSnippets = location.pathname.split('/').filter(i => i)
    const extraBreadcrumbItems = pathSnippets.map((_, index) => {
        const url = `/${pathSnippets.slice(0, index + 1).join('/')}`
        return  <Breadcrumb.Item key={url}>
                    <Link to={url}>{breadcrumbNameMap[url] || url}</Link>
                </Breadcrumb.Item>
    })
    const breadcrumbItems = [
        <Breadcrumb.Item key="home">
            <Link to="/"><HomeFilled/> Home</Link>
        </Breadcrumb.Item>,
    ].concat(extraBreadcrumbItems)

    return (
        <Breadcrumb separator="➤">
            {breadcrumbItems}
        </Breadcrumb>
    )
}
