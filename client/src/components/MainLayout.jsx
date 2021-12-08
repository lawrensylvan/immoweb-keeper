import React, { useState } from 'react'
import Sider from 'antd/lib/layout/Sider'
import SiderMenu from './SiderMenu'
import { useSearch, SearchContext } from '../hooks/useSearch'
import { Layout } from 'antd'
import '../styles.css'
import { Outlet } from 'react-router'

export default function MainLayout({children}) {

    const [collapsed, setCollapsed] = useState(false)

    return (

        <SearchContext.Provider value={useSearch()}>
            <Layout className="mainLayout">
                <Sider  theme="dark"
                        collapsible
                        collapsed={collapsed}
                        onCollapse={(c) => setCollapsed(c)}
                        onMouseLeave={() => setCollapsed(true)}
                        onMouseEnter={() => setCollapsed(false)}
                        style={{minHeight: '100vh'}}
                        >
                    <div style={{display: 'flex', justifyContent: 'center', padding: '10px 0px 10px 0px'}}>
                        <img src="logo512.png" alt="Immoweb Keeper" width="70%" style={{maxWidth: '100px'}} />
                    </div>
                    <SiderMenu collapsed={collapsed} />
                </Sider>
                <Outlet/>
            </Layout>
        </SearchContext.Provider>

    )
}
